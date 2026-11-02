# Build stage: Go 1.27, the current supported release. The "go 1.24.0" line in
# go.mod stays as the oldest version the code compiles with.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY . .
# With cgo off, the binary is static and needs nothing from the runtime image.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Runtime stage: only the binary. Distroless has no shell or package manager,
# and the nonroot variant runs as an unprivileged user.
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /out/server /server
# Listen on all interfaces inside the container (the default is loopback only).
ENV ADDR=:8081
EXPOSE 8081
USER nonroot:nonroot
ENTRYPOINT ["/server"]
