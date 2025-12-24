# ==============================================================================
# Stage 1: Build Rust Backend
# ==============================================================================
FROM messense/rust-musl-cross:x86_64-musl AS rust-builder

WORKDIR /usr/src/reacher

# Copy the entire workspace
COPY Cargo.toml ./
COPY .sqlx ./.sqlx
COPY backend ./backend
COPY cli ./cli
COPY core ./core
COPY sqs ./sqs

# Set offline mode for sqlx
ENV SQLX_OFFLINE=true

# Build the backend binary
RUN cargo build --bin reacher_backend --release --target=x86_64-unknown-linux-musl

# ==============================================================================
# Stage 2: Build TypeScript Actor
# ==============================================================================
FROM apify/actor-node:22 AS ts-builder

WORKDIR /usr/src/app

# Copy package files
COPY --chown=myuser:myuser package*.json ./

# Install dependencies including dev dependencies for build
RUN npm install --include=dev --audit=false

# Copy source files
COPY --chown=myuser:myuser tsconfig.json ./
COPY --chown=myuser:myuser src ./src

# Build TypeScript
RUN npm run build

# ==============================================================================
# Stage 3: Final Runtime Image
# ==============================================================================
FROM zenika/alpine-chrome:123

WORKDIR /home/chrome/

USER root

# Install necessary packages
RUN apk add --no-cache \
    chromium-chromedriver \
    nodejs \
    npm \
    curl \
    bash

# Copy Rust backend binary and config
COPY --from=rust-builder /usr/src/reacher/target/x86_64-unknown-linux-musl/release/reacher_backend ./
COPY --from=rust-builder /usr/src/reacher/backend/backend_config.toml ./

# Copy Node.js dependencies
COPY --chown=chrome:chrome package*.json ./
RUN npm install --omit=dev --omit=optional && rm -rf ~/.npm

# Copy built TypeScript Actor
COPY --from=ts-builder --chown=chrome:chrome /usr/src/app/dist ./dist

# Copy Actor configuration
COPY --chown=chrome:chrome .actor ./.actor

# Copy startup script
COPY --chown=chrome:chrome start.sh ./
RUN chmod +x start.sh

# Set ownership
RUN chown -R chrome:chrome /home/chrome

USER chrome

# Environment variables for Rust backend
ENV RUST_LOG=reacher=info
ENV RCH__HTTP_HOST=0.0.0.0
ENV RCH__WORKER__ENABLE=false
ENV RCH__HTTP_PORT=8080

# Environment variable for Actor
ENV BACKEND_URL=http://localhost:8080

EXPOSE 8080

# Remove entrypoint from parent image
ENTRYPOINT []

# Use startup script to launch both backend and actor
CMD ["./start.sh"]
