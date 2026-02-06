

## New Certificate instructions 
  


 # openssl genrsa -out server8183.key 2048
 ## OR 
 # openssl ecparam -name prime256v1 -genkey -noout -out server8183.key

cat <<'EOF' >openssl.cnf
[req]
default_bits              = 2048
req_extensions            = extension_requirements
distinguished_name        = dn_requirements
prompt                    = no

[extension_requirements]
basicConstraints          = CA:FALSE
keyUsage                  = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName            = @sans_list

[dn_requirements]
countryName               = GB
stateOrProvinceName       = London
localityName              = London
0.organizationName        = FUEL DATASCIENCE BIGDATA LIMITED
organizationalUnitName    = InsureYourTech.Cloud
commonName                = api-cloud-risk.insureyourtech.cloud
emailAddress              = business@insureyourtech.cloud

[sans_list]
DNS.1                     = api-cloud-risk.insureyourtech.cloud
DNS.2                     = simulation-cloud-risk.insureyourtech.cloud
DNS.3                     = customer-cloud-risk.insureyourtech.cloud

EOF


 # openssl req  -config openssl.cnf   -days 3650 -nodes -new -x509 -key server8183.key -out server8183.cert



 ## OLD Instructions

 Insert instructions here

    - generate key and cert
    - copy to certs folder
    - update server.js to use certs
    - update Dockerfile to expose ports 8184 and 443
    - update docker-compose file to use certs

 Run the following to generate key and cert , with a 10 year expiration
   

cat >> openssl.cnf <<EOF
[ req ]
prompt = no
distinguished_name = api_imsureyourtech_dotcloud 

[ api_imsureyourtech_dotcloud ]
C = GB
ST = London
L = London
O = InsureYourTech
OU = Cloud Services
CN = api.cloud.risk.insureyourtech.cloud
emailAddress = business@insureyourtech.com
EOF

 # openssl req  -config openssl.cnf   -days 3650 -nodes -new -x509 -keyout server8183.key -out server8183.cert

