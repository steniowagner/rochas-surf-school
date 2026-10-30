locals {
  name           = "rochas-staging"
  app_port       = 4000
  parameter_path = "/rochas/staging"
  log_group_name = "/rochas/staging/backend"

  subnet_cidrs = { for index, zone in var.availability_zones : zone => cidrsubnet(var.vpc_cidr, 8, index) }
}
