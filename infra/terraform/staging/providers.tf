provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "staging"
      ManagedBy   = "Terraform"
      Project     = "rochas-surf-school"
    }
  }
}

# Reads SUPABASE_ACCESS_TOKEN from the environment.
provider "supabase" {}
