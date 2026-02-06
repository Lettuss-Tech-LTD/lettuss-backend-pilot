# Cloud Insurance Risk Ratings API

## Overview

This API provides risk ratings for cloud providers based on various factors such as outages, security incidents, and compliance issues. It uses a combination of machine learning models and expert systems to generate risk ratings.

## Deployment

The API is deployed using Docker and Docker Compose. The `docker-compose.yml` file in the root directory will build and run the API container.

## Usage

To run the API, navigate to the root directory and run `docker compose up`. This will build and run the API container.

## API Endpoints

The API has the following endpoints:

- `GET /cloud-services-risk-ratings/risk-ratings`: Get the risk ratings for all cloud providers.
- `GET /cloud-services-risk-ratings/risk-ratings/provider/{provider}`: Get the risk ratings for a specific cloud provider.
- `GET /cloud-services-risk-ratings/risk-ratings/provider/outages/{provider}`: Get the risk ratings for a specific cloud provider and metric.
- `GET /cloud-services-risk-ratings/risk-ratings/provider/services/sla/{provider}`: Get the risk ratings for a specific cloud provider and metric.
- `GET /cloud-services-risk-ratings/risk-ratings/provider/services/risk.ratings/{provider}`: Get the risk ratings for a specific cloud provider and metric.


## Example Usage

To obtain a sample of all services and of all Outages from the Fremium API

```bash
admin@Admins-MacBook-Pro insureyourtechcloudgraph %   curl -X GET https://api-cloud-risk.localhost/cloud-services-risk-ratings/risk-ratings-premium/premium/list/all/services > sample_list_all_services_api.json
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  320k  100  320k    0     0  17.4M      0 --:--:-- --:--:-- --:--:-- 18.3M
admin@Admins-MacBook-Pro insureyourtechcloudgraph % 

admin@Admins-MacBook-Pro insureyourtechcloudgraph % curl -X GET https://api-cloud-risk.localhost/cloud-services-risk-ratings/risk-ratings-premium/premium/outages/list/all  > sample_list_all_outages_api.json       
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  309k  100  309k    0     0  14.9M      0 --:--:-- --:--:-- --:--:-- 15.1M
admin@Admins-MacBook-Pro insureyourtechcloudgraph % 
    ```

To get the risk ratings for all cloud providers, you can make a GET request to the `/cloud-services-risk-ratings/risk-ratings` endpoints , as examples below.

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings
    ``` 

To get the risk ratings for a specific cloud provider, you can make a GET request to the `/cloud-services-risk-ratings/risk-ratings/{provider}` endpoint.

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/risk-ratings/provider/aws
```


To get the risk ratings for a specific cloud provider and metric, you can make a GET request to the `/risk-ratings/{provider}/{metric}` endpoint.

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/provider/outages/aws
```

An Example of the CSV data can be found in the `csv-loader` directory.

```bash
 cat data/lettuss_rental_properties.csv
 cat data/lettuss_rental_subscriptions.csv
 docker compose up --build
```

To rebuild the API without running it, use the following command, option 3:

```bash
 bash -x build-api-cluster 3
```

Example of fetching a specific risk rating by ID:

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/fetch/service/id/10000000000000 
```

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/fetch/service/id/10000000000000 
{"database_key_id_10000000000001":"10000000000000","service_name":"autonomousdb_21c","service_provider":"oci","region_or_global":"global","service_load_at_customer_low_medium_high_very_high_1_2_3_4":"3","customer_service_type_b2c_or_b2b_1_yes_0_no":"0","customer_service_up_hours_8h_day_12h_day_24h_day":"24","customer_service_anual_days_daily_or_weekly_or_weekends_365_261":"365","service_sla_0_99_9999_for_60min_times_24h_365days":"99.99","webscraper_annual_period_service_down_per_year_in_minutes":"360","annual_service_minutes_up_365_24_60_equals_525600":"525600.000","expected_by_sla_annual_service_minutes_up_365_times_24_60_equal":"525547.440","expected_annual_service_minutes_down":"52.560","service_debit_credit_anual_sla_minutes_in_positive_credit_or_ne":"-307.440","expected_percentage_mins_down_on_agreed_sla":"0.01%","actual_percentage_total_mins_down_from_webscraping":"0.07%","actual_percentage_mins_down_on_agreed_sla":"0.07%","gap_time_percent_between_sla_down_actual_down":"-0.06%","riskcoef_per_service_from_gap_expected_actual_time_down":"0.06%","service_sla_usage_percentage":"684.93%","service_traffic_coef_by_percent_down":"0.05%","sla_deviation_connected_risk_0_999":"991.373","usage_connected_risk_0_999":"997.118","notes":""}% 
```

Example of fetching a specific risk rating by service_provider:

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/service/service_provider/:service_provider
```
```bash
curl -X GET  http://localhost:8000/cloud-services-risk-ratings/risk-ratings/fetch/service/service_provider/aws
{"database_key_id_10000000000001":"10000000000006","service_name":"aws_lambda","service_provider":"aws","region_or_global":"global","service_load_at_customer_low_medium_high_very_high_1_2_3_4":"4","customer_service_type_b2c_or_b2b_1_yes_0_no":"0","customer_service_up_hours_8h_day_12h_day_24h_day":"24","customer_service_anual_days_daily_or_weekly_or_weekends_365_261":"365","service_sla_0_99_9999_for_60min_times_24h_365days":"99.95","webscraper_annual_period_service_down_per_year_in_minutes":"400","annual_service_minutes_up_365_24_60_equals_525600":"525600.000","expected_by_sla_annual_service_minutes_up_365_times_24_60_equal":"525337.200","expected_annual_service_minutes_down":"262.800","service_debit_credit_anual_sla_minutes_in_positive_credit_or_ne":"-137.200","expected_percentage_mins_down_on_agreed_sla":"0.05%","actual_percentage_total_mins_down_from_webscraping":"0.08%","actual_percentage_mins_down_on_agreed_sla":"0.08%","gap_time_percent_between_sla_down_actual_down":"-0.03%","riskcoef_per_service_from_gap_expected_actual_time_down":"0.03%","service_sla_usage_percentage":"152.21%","service_traffic_coef_by_percent_down":"0.08%","sla_deviation_connected_risk_0_999":"996.220","usage_connected_risk_0_999":"996.719","notes":""}% 
```

Example of fetching a specific risk rating by service_name:

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/service/service_name/:service_name
```
```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/fetch/service/service_name/powerbi_app
{"database_key_id_10000000000001":"10000000000009","service_name":"powerbi_app","service_provider":"azure","region_or_global":"global","service_load_at_customer_low_medium_high_very_high_1_2_3_4":"1","customer_service_type_b2c_or_b2b_1_yes_0_no":"1","customer_service_up_hours_8h_day_12h_day_24h_day":"24","customer_service_anual_days_daily_or_weekly_or_weekends_365_261":"365","service_sla_0_99_9999_for_60min_times_24h_365days":"99.99","webscraper_annual_period_service_down_per_year_in_minutes":"370","annual_service_minutes_up_365_24_60_equals_525600":"525600.000","expected_by_sla_annual_service_minutes_up_365_times_24_60_equal":"525547.440","expected_annual_service_minutes_down":"52.560","service_debit_credit_anual_sla_minutes_in_positive_credit_or_ne":"-317.440","expected_percentage_mins_down_on_agreed_sla":"0.01%","actual_percentage_total_mins_down_from_webscraping":"0.07%","actual_percentage_mins_down_on_agreed_sla":"0.07%","gap_time_percent_between_sla_down_actual_down":"-0.06%","riskcoef_per_service_from_gap_expected_actual_time_down":"0.06%","service_sla_usage_percentage":"703.96%","service_traffic_coef_by_percent_down":"0.02%","sla_deviation_connected_risk_0_999":"991.164","usage_connected_risk_0_999":"997.418","notes":""}% 
```

Example of listing all services:

```bash
curl -X GET http://localhost:8000/cloud-services-risk-ratings/risk-ratings/list/all/services
```