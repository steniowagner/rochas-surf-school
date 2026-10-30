variable "aws_region" {
  description = "AWS region of the state bucket"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket that keeps the Terraform state"
  type        = string
  default     = "rochas-surf-school-terraform-state"
}
