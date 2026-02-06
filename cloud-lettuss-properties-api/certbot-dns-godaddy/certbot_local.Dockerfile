FROM miigotu/certbot-dns-godaddy

COPY letsencrypt/ /var/lib/letsencrypt/
COPY letsencrypt/ /etc/letsencrypt/

RUN chmod 600 /var/lib/letsencrypt/godaddy_credentials.ini

CMD ["sleep", "3600"]
