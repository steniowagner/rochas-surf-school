resource "aws_service_discovery_http_namespace" "main" {
  name = local.name
}

resource "aws_service_discovery_service" "backend" {
  name         = "backend"
  namespace_id = aws_service_discovery_http_namespace.main.id
}

resource "aws_service_discovery_instance" "server" {
  instance_id = aws_instance.server.id
  service_id  = aws_service_discovery_service.backend.id

  attributes = {
    AWS_INSTANCE_IPV4 = aws_instance.server.private_ip
    AWS_INSTANCE_PORT = tostring(local.app_port)
  }
}

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = local.name
  security_group_ids = [aws_security_group.vpc_link.id]
  subnet_ids         = [for subnet in aws_subnet.public : subnet.id]
}

# The execute-api address is off, so the custom domain below is the only way in (D-03).
resource "aws_apigatewayv2_api" "main" {
  name                         = local.name
  protocol_type                = "HTTP"
  disable_execute_api_endpoint = true
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = aws_service_discovery_service.backend.arn
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id

  # Overwrites whatever the caller sent, so the rate limits can trust it (D-06).
  request_parameters = {
    "overwrite:header.x-client-ip" = "$context.identity.sourceIp"
  }
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 20
    throttling_burst_limit = 40
  }
}

resource "aws_acm_certificate" "api" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until the validation CNAME is in place at Hostinger.
resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
}

resource "aws_apigatewayv2_domain_name" "main" {
  domain_name = var.domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.main.id
  stage       = aws_apigatewayv2_stage.default.id
}
