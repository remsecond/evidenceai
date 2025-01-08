#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load staging environment
load_staging_env() {
    echo -e "${YELLOW}Loading staging environment...${NC}"
    if [ -f .env.staging ]; then
        export $(cat .env.staging | grep -v '^#' | xargs)
        echo -e "${GREEN}Staging environment loaded${NC}"
    else
        echo -e "${RED}Error: .env.staging file not found${NC}"
        exit 1
    fi
}

# Prepare staging data
prepare_staging_data() {
    echo -e "${YELLOW}Preparing staging data...${NC}"
    
    # Create staging directories
    mkdir -p ./storage/staging/emails
    mkdir -p ./storage/staging/documents
    
    # Copy sample data
    cp ./tests/fixtures/sample_email.eml ./storage/staging/emails/
    
    echo -e "${GREEN}Staging data prepared${NC}"
}

# Initialize monitoring for staging
init_monitoring() {
    echo -e "${YELLOW}Initializing monitoring...${NC}"
    
    # Create monitoring directories
    mkdir -p ./monitoring/prometheus/staging
    mkdir -p ./monitoring/grafana/dashboards/staging
    
    # Configure Prometheus for staging
    cat > ./monitoring/prometheus/staging/prometheus.yml <<EOF
global:
  scrape_interval: 10s
  evaluation_interval: 10s

scrape_configs:
  - job_name: 'evidenceai-staging'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
EOF
    
    echo -e "${GREEN}Monitoring initialized${NC}"
}

# Deploy staging environment
deploy_staging() {
    echo -e "${YELLOW}Deploying staging environment...${NC}"
    
    # Build staging images
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml build
    
    # Start services
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
    
    echo -e "${GREEN}Staging environment deployed${NC}"
}

# Configure initial test data
configure_test_data() {
    echo -e "${YELLOW}Configuring test data...${NC}"
    
    # Wait for Neo4j to be ready
    sleep 10
    
    # Initialize Neo4j with test data
    docker-compose exec -T neo4j cypher-shell -u neo4j -p "${NEO4J_PASSWORD}" <<EOF
CREATE CONSTRAINT ON (p:Person) ASSERT p.email IS UNIQUE;
CREATE CONSTRAINT ON (m:Message) ASSERT m.id IS UNIQUE;
EOF
    
    echo -e "${GREEN}Test data configured${NC}"
}

# Setup monitoring dashboards
setup_dashboards() {
    echo -e "${YELLOW}Setting up monitoring dashboards...${NC}"
    
    # Wait for Grafana to be ready
    sleep 5
    
    # Configure Grafana datasource
    curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"name":"Prometheus","type":"prometheus","url":"http://prometheus:9090","access":"proxy"}' \
        http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3001/api/datasources
    
    echo -e "${GREEN}Dashboards configured${NC}"
}

# Health check for staging environment
check_staging_health() {
    echo -e "${YELLOW}Checking staging environment health...${NC}"
    
    # Check application
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}Application is healthy${NC}"
    else
        echo -e "${RED}Application health check failed${NC}"
    fi
    
    # Check Neo4j
    if curl -s http://localhost:7474 > /dev/null; then
        echo -e "${GREEN}Neo4j is healthy${NC}"
    else
        echo -e "${RED}Neo4j health check failed${NC}"
    fi
    
    # Check monitoring
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        echo -e "${GREEN}Prometheus is healthy${NC}"
    else
        echo -e "${RED}Prometheus health check failed${NC}"
    fi
    
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}Grafana is healthy${NC}"
    else
        echo -e "${RED}Grafana health check failed${NC}"
    fi
}

# Initialize test suite
init_test_suite() {
    echo -e "${YELLOW}Initializing test suite...${NC}"
    
    # Prepare test environment
    npm run test:setup
    
    # Run initial tests
    npm run test:staging
    
    echo -e "${GREEN}Test suite initialized${NC}"
}

# Main staging deployment flow
main() {
    echo -e "${YELLOW}Starting staging deployment${NC}"
    
    load_staging_env
    prepare_staging_data
    init_monitoring
    deploy_staging
    configure_test_data
    setup_dashboards
    check_staging_health
    init_test_suite
    
    echo -e "${GREEN}Staging deployment completed${NC}"
    echo -e "\nStaging environment is available at:"
    echo -e "- Application: http://localhost:3000"
    echo -e "- Grafana: http://localhost:3001"
    echo -e "- Prometheus: http://localhost:9090"
    echo -e "- Neo4j Browser: http://localhost:7474"
    echo -e "\nMonitoring dashboards are configured and collecting data"
    echo -e "Initial test data has been loaded"
}

# Script argument handling
case "$1" in
    "prepare")
        prepare_staging_data
        ;;
    "monitor")
        init_monitoring
        setup_dashboards
        ;;
    "deploy")
        deploy_staging
        ;;
    "test")
        init_test_suite
        ;;
    "health")
        check_staging_health
        ;;
    *)
        main
        ;;
esac
