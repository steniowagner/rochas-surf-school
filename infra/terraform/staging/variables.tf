variable "availability_zones" {
  description = "The two availability zones of the public subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]

  validation {
    condition     = length(var.availability_zones) == 2
    error_message = "The staging network uses exactly two availability zones."
  }
}

variable "aws_region" {
  description = "AWS region of the whole stack (D-01)"
  type        = string
  default     = "us-east-1"
}

variable "backend_image" {
  description = "Container image of the backend, without its tag"
  type        = string
  default     = "ghcr.io/steniowagner/rochas-surf-school-backend"
}

variable "domain_name" {
  description = "Public address of the API; its DNS records are added by hand at Hostinger (D-13)"
  type        = string
  default     = "api-staging.rochassurfschool.com"
}

variable "github_subject_prefix" {
  description = "The repository's prefix in GitHub's OIDC subject; it uses immutable IDs, so read it from the repo's actions/oidc/customization/sub API"
  type        = string
  default     = "repo:steniowagner@5205982/rochas-surf-school@1402019853"
}

variable "instance_type" {
  description = "EC2 instance type of the server; it must be ARM, as the image is"
  type        = string
  default     = "t4g.small"
}

variable "supabase_organization_id" {
  description = "Slug of the Supabase organization that owns the project"
  type        = string
  default     = "kyifpvzdlbiotepohvot"
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
  default     = "10.20.0.0/16"
}
