#/bin/bash env
#
echo "Get Logs - API Databases & Customer-Portal "
#
cd insureyourtechcloudgraph/cloud-lettuss-properties-api
docker-compose logs > build-api-cluster.log
cp -rf build-api-cluster.log ~  
cd ~
#
cd insureyourtechcloudgraph/cloud-lettuss-customer-portal 
docker-compose logs > customer-app-start.log 
cp -rf customer-app-start.log ~
cd ~
#
ls -listarh *.log 
