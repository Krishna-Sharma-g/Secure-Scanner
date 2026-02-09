FROM golang:1.21-alpine AS builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -o securescanner cmd/securescanner/main.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/securescanner /usr/local/bin/securescanner
ENTRYPOINT ["securescanner"]
