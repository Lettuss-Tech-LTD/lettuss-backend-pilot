#/bin/bash env
#
echo "Deploy - Customer Portal 2 Apps - && -  Data Outage and Services SLA Data - from home directory "
cd ~
ls -listarh *.csv 
#
mv -f cloud-risk-datamodel-services-above-sla-outage.csv  insureyourtechcloudgraph/information/datamodel/
mv -f outage_report_summary_2025*.csv  outage_report_summary_2025*.txt insureyourtechcloudgraph/cloud-information-genai-workbench/pdf_bot_usebatch/
#
cd insureyourtechcloudgraph/cloud-lettuss-customer-portal
bash -x customer-app-start 4 1 0
cd ~
cd insureyourtechcloudgraph/cloud-lettuss-properties-api/
##not needed in internal script#docker-compose down ;  docker system prune -f ; docker volume prune -f 
bash -x build-api-cluster 4 1 1
cd ~
#
echo "Done! Deployment of Customer Portal Apps, Data Outage and Services SLA Data - from home directory "
#