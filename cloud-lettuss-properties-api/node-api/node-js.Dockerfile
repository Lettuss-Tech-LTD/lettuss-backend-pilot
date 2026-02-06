# Use the official Node.js image as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy certs
# Copy certs and set permissions
COPY certs ./certs
RUN chmod 400 /app/certs/server8183.key /app/certs/server8183.cert

# Copy the rest of the application files
COPY . .

# Expose the port that the Node.js app will run on
EXPOSE 8183

# Define the command to run the application
CMD ["npm", "start"]
