# Specify the base Docker image. You can read more about
# the available images at https://docs.apify.com/sdk/js/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node:22 AS builder

# Install Rust and Cargo for building the native addon
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/myuser/.cargo/bin:${PATH}"

# Check preinstalled packages
RUN npm ls @crawlee/core apify puppeteer playwright

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser:myuser package*.json ./

# Install all dependencies. Don't audit to speed up the installation.
RUN npm install --include=dev --audit=false

# Copy Cargo files for the workspace and native addon
COPY --chown=myuser:myuser Cargo.toml Cargo.lock ./
COPY --chown=myuser:myuser core ./core
COPY --chown=myuser:myuser node-addon ./node-addon

# Build the Rust native addon first
RUN cd node-addon && cargo build --release

# Next, copy the remaining source files using the user set
# in the base image.
COPY --chown=myuser:myuser . ./

# Install all dependencies and build the project.
# Don't audit to speed up the installation.
RUN npm run build

# Create final image
FROM apify/actor-node:22

# Check preinstalled packages
RUN npm ls @crawlee/core apify puppeteer playwright

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser:myuser package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy built JS files from builder image
COPY --from=builder --chown=myuser:myuser /usr/src/app/dist ./dist

# Copy the built native addon from builder image
# Copy the entire target/release directory to preserve the .node file
RUN mkdir -p node-addon/target/release
COPY --from=builder --chown=myuser:myuser /usr/src/app/node-addon/target/release/*.node ./node-addon/target/release/ 2>/dev/null || true

# Copy node-addon source files needed at runtime
COPY --chown=myuser:myuser node-addon/index.ts ./node-addon/
COPY --chown=myuser:myuser node-addon/package.json ./node-addon/

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY --chown=myuser:myuser . ./

# Run the image.
CMD ["node", "dist/main.js"]
