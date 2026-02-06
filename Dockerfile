#
FROM neo4j:5.25.1-community
# FROM neo4j:5.11
#
EXPOSE 7473/tcp
EXPOSE 7474/tcp
EXPOSE 7687/tcp
#
ENTRYPOINT ["tini" "-g" "--" "/startup/docker-entrypoint.sh"]
#
CMD ["neo4j"]
#
