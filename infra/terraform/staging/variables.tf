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

variable "instance_type" {
  description = "EC2 instance type of the server; it must be ARM, as the image is"
  type        = string
  default     = "t4g.small"
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
  default     = "10.20.0.0/16"
}
