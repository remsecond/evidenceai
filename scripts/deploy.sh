#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Environment validation
validate_environment() {
    echo -e "${YELLOW}Validating environment...${NC}"
    
    # Check required environment variables
    required_vars=(
        "NEO4J_URI"
        "NEO4J_USERNAME"
        "NEO4J_PASSWORD"
        "OPENAI_API_KEY"
        "PINECONE_API_KEY"
        "PINECONE_ENVIRONMENT"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    missing_vars=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}Error: $var is not set${NC}"
            missing_vars=1
        fi
    done
    
    if [ $missing_vars -eq 1 ]; then
        echo -e "${RED}Environment validation failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Environment validation passed${NC}"
}

# Docker environment check
check_docker() {
    echo -e "${YELLOW}Checking Docker environment...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}Docker environment check passed${NC}"
}

# Build and deploy
deploy() {
    echo -e "${YELLOW}Starting deployment...${NC}"
    
    # Pull latest images
    echo "Pulling latest images..."
    docker-compose pull
    
    # Build application
    echo "Building application..."
    docker-compose build --no-cache app
    
    # Start services
    echo "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    services=("app" "neo4j" "prometheus" "grafana")
    for service in "${services[@]}"; do
        if [ "$(docker-compose ps -q $service)" ]; then
            if [ "$(docker inspect --format='{{.State.Health.Status}}' $(docker-compose ps -q $service))" = "healthy" ]; then
                echo -e "${GREEN}$service is healthy${NC}"
            else
                echo -e "${RED}Warning: $service may not be healthy${NC}"
            fi
        else
            echo -e "${RED}Error: $service is not running${NC}"
            exit 1
        fi
    done
}

# Monitoring check
check_monitoring() {
    echo -e "${YELLOW}Checking monitoring stack...${NC}"
    
    # Check Prometheus
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        echo -e "${GREEN}Prometheus is responding${NC}"
    else
        echo -e "${RED}Warning: Prometheus is not responding${NC}"
    fi
    
    # Check Grafana
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}Grafana is responding${NC}"
    else
        echo -e "${RED}Warning: Grafana is not responding${NC}"
    fi
}

# Main deployment flow
main() {
    echo -e "${YELLOW}Starting EvidenceAI deployment${NC}"
    
    validate_environment
    check_docker
    deploy
    check_monitoring
    
    echo -e "${GREEN}Deployment completed successfully${NC}"
    echo -e "Services are available at:"
    echo -e "- Application: http://localhost:3000"
    echo -e "- Grafana: http://localhost:3001"
    echo -e "- Prometheus: http://localhost:9090"
    echo -e "- Neo4j Browser: http://localhost:7474"
}

# Handle script arguments
case "$1" in
    "validate")
        validate_environment
        ;;
    "check-docker")
        check_docker
        ;;
    "deploy")
        deploy
        ;;
    "check-monitoring")
        check_monitoring
        ;;
    *)
        main
        ;;
esac
