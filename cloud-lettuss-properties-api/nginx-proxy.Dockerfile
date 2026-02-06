FROM nginx:1.27-perl

COPY certs /etc/nginx/certs/
RUN chmod 400 /etc/nginx/certs/server8183.key /etc/nginx/certs/server8183.cert
RUN chmod 400 /etc/nginx/certs/server8184.key /etc/nginx/certs/server8184.cert
RUN chmod 400 /etc/nginx/certs/cserver8184.key /etc/nginx/certs/cserver8184.cert
RUN chmod 400 /etc/nginx/certs/server8185.key /etc/nginx/certs/server8185.cert
RUN chmod 400 /etc/nginx/certs/server8186.key /etc/nginx/certs/server8186.cert
