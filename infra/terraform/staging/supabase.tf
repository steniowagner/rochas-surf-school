resource "random_password" "database" {
  length  = 32
  special = false
}

# The API and the database sit in the same region (D-01).
resource "supabase_project" "main" {
  organization_id   = var.supabase_organization_id
  name              = local.name
  database_password = random_password.database.result
  region            = var.aws_region
}
