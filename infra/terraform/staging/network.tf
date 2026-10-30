resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = local.name
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = local.name
  }
}

# Public subnets and no NAT gateway (D-05): the server's public IP is for its outbound calls only.
resource "aws_subnet" "public" {
  for_each = local.subnet_cidrs

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value

  tags = {
    Name = "${local.name}-${each.key}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name}-public"
  }
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "vpc_link" {
  name        = "${local.name}-vpc-link"
  description = "API Gateway VPC link"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "server" {
  name        = "${local.name}-server"
  description = "Backend server: only the VPC link reaches it (D-04)"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_egress_rule" "vpc_link_to_server" {
  security_group_id            = aws_security_group.vpc_link.id
  description                  = "To the backend"
  ip_protocol                  = "tcp"
  from_port                    = local.app_port
  to_port                      = local.app_port
  referenced_security_group_id = aws_security_group.server.id
}

# The server's only ingress rule. Port 22 stays closed: access goes through SSM.
resource "aws_vpc_security_group_ingress_rule" "server_from_vpc_link" {
  security_group_id            = aws_security_group.server.id
  description                  = "From the VPC link"
  ip_protocol                  = "tcp"
  from_port                    = local.app_port
  to_port                      = local.app_port
  referenced_security_group_id = aws_security_group.vpc_link.id
}

resource "aws_vpc_security_group_egress_rule" "server_to_internet" {
  security_group_id = aws_security_group.server.id
  description       = "Supabase, Expo, Resend, Anthropic, Google, GHCR and the AWS endpoints"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
