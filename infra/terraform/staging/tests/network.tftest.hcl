# Mocked providers: these tests need no AWS or Supabase credentials and create nothing.
mock_provider "aws" {
  mock_data "aws_ssm_parameter" {
    defaults = {
      insecure_value = "ami-0123456789abcdef0"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{}"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_resource "aws_acm_certificate_validation" {
    defaults = {
      certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
    }
  }

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
      domain_validation_options = [
        {
          domain_name           = "api-staging.rochassurfschool.com"
          resource_record_name  = "_validation.api-staging.rochassurfschool.com."
          resource_record_type  = "CNAME"
          resource_record_value = "_target.acm-validations.aws."
        }
      ]
    }
  }

  mock_resource "aws_apigatewayv2_domain_name" {
    defaults = {
      domain_name_configuration = {
        target_domain_name = "d-example.execute-api.us-east-1.amazonaws.com"
      }
    }
  }

  mock_resource "aws_cloudwatch_log_group" {
    defaults = {
      arn = "arn:aws:logs:us-east-1:123456789012:log-group:/rochas/staging/backend"
    }
  }
}

mock_provider "random" {}

mock_provider "supabase" {}

run "server_security_group_only_admits_the_vpc_link" {
  assert {
    condition     = length(aws_security_group.server.ingress) == 0
    error_message = "The server's security group must have no inline ingress rules."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.server_from_vpc_link.referenced_security_group_id == aws_security_group.vpc_link.id
    error_message = "Port 4000 must only be open to the VPC link's security group."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.server_from_vpc_link.security_group_id == aws_security_group.server.id
    error_message = "The ingress rule must belong to the server's security group."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.server_from_vpc_link.from_port == 4000 && aws_vpc_security_group_ingress_rule.server_from_vpc_link.to_port == 4000
    error_message = "The ingress rule must cover port 4000 and nothing else, so never port 22."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.server_from_vpc_link.cidr_ipv4 == null && aws_vpc_security_group_ingress_rule.server_from_vpc_link.cidr_ipv6 == null
    error_message = "The ingress rule must not admit any CIDR, so never 0.0.0.0/0 or ::/0."
  }
}

run "server_is_hardened" {
  assert {
    condition     = aws_instance.server.metadata_options[0].http_tokens == "required"
    error_message = "The server must require IMDSv2."
  }

  assert {
    condition     = aws_instance.server.root_block_device[0].encrypted
    error_message = "The server's root volume must be encrypted."
  }

  assert {
    condition     = aws_instance.server.instance_type == "t4g.small"
    error_message = "The server is one t4g.small."
  }
}

run "subnets_are_public_in_two_zones_without_nat" {
  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "The network needs two subnets."
  }

  assert {
    condition     = one(aws_route_table.public.route).gateway_id == aws_internet_gateway.main.id
    error_message = "The subnets must route through the internet gateway."
  }
}

run "logs_stay_for_14_days" {
  assert {
    condition     = aws_cloudwatch_log_group.backend.name == "/rochas/staging/backend" && aws_cloudwatch_log_group.backend.retention_in_days == 14
    error_message = "The container logs go to /rochas/staging/backend, kept 14 days."
  }
}

run "the_gateway_writes_the_client_ip" {
  assert {
    condition     = aws_apigatewayv2_integration.backend.request_parameters["overwrite:header.x-client-ip"] == "$context.identity.sourceIp"
    error_message = "The integration must overwrite x-client-ip with the caller's IP (D-06)."
  }
}

run "the_custom_domain_is_the_only_way_in" {
  assert {
    condition     = aws_apigatewayv2_api.main.disable_execute_api_endpoint
    error_message = "The execute-api address must be disabled."
  }

  assert {
    condition     = aws_apigatewayv2_domain_name.main.domain_name == "api-staging.rochassurfschool.com" && aws_apigatewayv2_api_mapping.main.domain_name == aws_apigatewayv2_domain_name.main.id
    error_message = "The API must be mapped to api-staging.rochassurfschool.com."
  }
}

run "traffic_goes_through_the_vpc_link_to_cloud_map" {
  assert {
    condition     = aws_apigatewayv2_integration.backend.connection_type == "VPC_LINK" && aws_apigatewayv2_integration.backend.connection_id == aws_apigatewayv2_vpc_link.main.id
    error_message = "The integration must go through the VPC link."
  }

  assert {
    condition     = aws_apigatewayv2_integration.backend.integration_uri == aws_service_discovery_service.backend.arn
    error_message = "The integration must target the Cloud Map service."
  }

  assert {
    condition     = contains(aws_apigatewayv2_vpc_link.main.security_group_ids, aws_security_group.vpc_link.id)
    error_message = "The VPC link must use the security group the server admits."
  }

  assert {
    condition     = aws_service_discovery_instance.server.attributes["AWS_INSTANCE_PORT"] == "4000"
    error_message = "The server must be registered on port 4000."
  }
}

run "the_stage_is_throttled" {
  assert {
    condition     = aws_apigatewayv2_stage.default.default_route_settings[0].throttling_rate_limit == 20 && aws_apigatewayv2_stage.default.default_route_settings[0].throttling_burst_limit == 40
    error_message = "The stage is limited to 20 requests per second, burst 40."
  }
}

run "the_outputs_give_both_cnames" {
  assert {
    condition     = output.certificate_validation_cname.name == "_validation.api-staging.rochassurfschool.com." && output.api_cname.value == "d-example.execute-api.us-east-1.amazonaws.com"
    error_message = "The outputs must carry the two CNAMEs for Hostinger."
  }
}

run "the_database_sits_next_to_the_server" {
  assert {
    condition     = supabase_project.main.region == "us-east-1"
    error_message = "The Supabase project must be in us-east-1 (D-01)."
  }

  assert {
    condition     = supabase_project.main.organization_id == "kyifpvzdlbiotepohvot"
    error_message = "The project goes in the rochas-surf-school organization."
  }
}

run "only_the_staging_environment_can_deploy" {
  assert {
    condition = anytrue([
      for condition in data.aws_iam_policy_document.deploy_trust.statement[0].condition :
      condition.test == "StringEquals" &&
      condition.variable == "token.actions.githubusercontent.com:sub" &&
      toset(condition.values) == toset(["repo:steniowagner/rochas-surf-school:environment:staging"])
    ])
    error_message = "The deploy role must trust only this repository's staging environment, with an exact match."
  }

  assert {
    condition = anytrue([
      for condition in data.aws_iam_policy_document.deploy_trust.statement[0].condition :
      condition.test == "StringEquals" &&
      condition.variable == "token.actions.githubusercontent.com:aud" &&
      toset(condition.values) == toset(["sts.amazonaws.com"])
    ])
    error_message = "The deploy role must require the STS audience."
  }
}

run "the_deploy_role_stays_narrow" {
  assert {
    condition = (
      data.aws_iam_policy_document.deploy.statement[0].actions == toset(["ssm:SendCommand"]) &&
      data.aws_iam_policy_document.deploy.statement[0].resources == toset([aws_instance.server.arn, aws_ssm_document.deploy.arn])
    )
    error_message = "The role may only send the deploy document to this server."
  }

  assert {
    condition     = length(data.aws_iam_policy_document.deploy.statement[2].resources) == 2
    error_message = "The role may only read the two parameters of D-12."
  }

  assert {
    condition     = jsondecode(aws_ssm_document.deploy.content).parameters.commit.allowedPattern == "^[0-9a-f]{40}$"
    error_message = "The deploy document must only accept a commit SHA."
  }
}

run "the_two_zones_are_required" {
  command = plan

  variables {
    availability_zones = ["us-east-1a"]
  }

  expect_failures = [var.availability_zones]
}
