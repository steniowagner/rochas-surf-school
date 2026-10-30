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

  mock_resource "aws_cloudwatch_log_group" {
    defaults = {
      arn = "arn:aws:logs:us-east-1:123456789012:log-group:/rochas/staging/backend"
    }
  }
}

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

run "the_two_zones_are_required" {
  command = plan

  variables {
    availability_zones = ["us-east-1a"]
  }

  expect_failures = [var.availability_zones]
}
