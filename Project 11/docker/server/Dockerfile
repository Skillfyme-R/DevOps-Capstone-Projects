# syntax=docker/dockerfile:1
# Pulsar / Reelforge Media — pulsar-server image

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY pulsar-common/pom.xml pulsar-common/pom.xml
COPY pulsar-core/pom.xml pulsar-core/pom.xml
COPY pulsar-server/pom.xml pulsar-server/pom.xml
COPY pulsar-worker-sdk/pom.xml pulsar-worker-sdk/pom.xml
COPY pulsar-common/src pulsar-common/src
COPY pulsar-core/src pulsar-core/src
COPY pulsar-server/src pulsar-server/src
RUN mvn -pl pulsar-common,pulsar-core,pulsar-server -am clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S pulsar && adduser -S pulsar -G pulsar
WORKDIR /app
COPY --from=build /build/pulsar-server/target/pulsar-server-exec.jar /app/pulsar-server.jar
RUN chown -R pulsar:pulsar /app
USER pulsar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-jar", "/app/pulsar-server.jar"]
