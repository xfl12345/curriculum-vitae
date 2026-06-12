# ARG BUILD_IMAGE_TAG=ghcr.io/graalvm/graalvm-community:25
# RUN microdnf install -y git
ARG BUILD_IMAGE_TAG=gradle:9.5-jdk25-graal-resolute
ARG JVM_RUNTIME_IMAGE_TAG=registry.access.redhat.com/ubi9/openjdk-25-runtime:1.24
FROM $BUILD_IMAGE_TAG AS builder
RUN apt update
RUN apt install -y git
WORKDIR /app/
COPY . ./
SHELL ["/usr/bin/bash", "-c"]
RUN curl -fsSL https://vite.plus | bash
RUN source "$HOME/.vite-plus/env" && vp i -g corepack
RUN mkdir /app/storage
RUN mkdir /app/config
# RUN source "$HOME/.vite-plus/env" && ./gradlew --refresh-dependencies
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
    --mount=type=cache,target=/root/.m2 \
    source "$HOME/.vite-plus/env" && ./gradlew --info build

FROM $JVM_RUNTIME_IMAGE_TAG
ENV LANGUAGE='en_US:en'

# We make four distinct layers so if there are application changes the library layers can be re-used
COPY --from=builder --chown=185 /app/build/quarkus-app/lib/ /deployments/lib/
COPY --from=builder --chown=185 /app/build/quarkus-app/*.jar /deployments/
COPY --from=builder --chown=185 /app/build/quarkus-app/app/ /deployments/app/
COPY --from=builder --chown=185 /app/build/quarkus-app/quarkus/ /deployments/quarkus/

USER root
RUN mkdir -p /deployments/storage && chown 185:root /deployments/storage
RUN mkdir -p /var/run && chmod 777 /var/run
USER 185

EXPOSE 8080
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENV JAVA_APP_JAR="/deployments/quarkus-run.jar"

ENTRYPOINT [ "/opt/jboss/container/java/run/run-java.sh" ]

