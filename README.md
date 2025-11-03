# NGARO - Database Migration Tool

A robust Node.js-based tool for migrating data between databases with support for SSH tunneling and automatic data type handling.

## Features

- SSH Tunnel support for secure remote database connections
- Flexible authentication methods (password or private key)
- Automatic handling of MySQL DATETIME and TIMESTAMP fields
- Bulk data transfer with duplicate handling
- Support for field mapping between source and destination
- Environment variable based configuration
- Built with Express.js and Sequelize but can add your ORM of choice and plug and the connection

## Configuration

### SSH Tunnel Configuration

Set the following environment variables for SSH tunnel:

- `SSH_TUNNEL_LOCAL_HOST`: Local host for SSH tunnel
- `SSH_TUNNEL_LOCAL_PORT`: Local port for SSH tunnel
- `SSH_HOST_REMOTE_USERNAME`: Remote SSH username
- `SSH_HOST_REMOTE_ADDRESS`: Remote SSH host address
- `SSH_HOST_REMOTE_PORT`: Remote SSH port
- `SSH_HOST_LOCAL_SRC_HOST`: Local source host
- `SSH_HOST_LOCAL_SRC_PORT`: Local source port
- `SSH_HOST_REMOTE_DST_HOST`: Remote destination host
- `SSH_HOST_REMOTE_DST_PORT`: Remote destination port
- `SSH_HOST_REMOTE_CREDENTIAL`: SSH credential (password or path to private key)

### Destination Database Configuration

Set the following environment variables for the destination database:

- `DEST_DB_USERNAME`: Database username
- `DEST_DB_DATABASE`: Database name
- `DEST_DB_PASSWORD`: Database password
- `DEST_DB_HOST`: Database host
- `DEST_DB_PORT`: Database port
- `DEST_DB_DIALECT`: Database dialect (e.g., mysql, postgres)
  NOTE: You can extend this .env and create as many database configs as you wish since the db configs are passed and dynamically

## Usage

1. Set up all required environment variables
2. Configure source and destination database connections
3. Run the script:
   ```bash
   npm start
   ```

The script will:

1. Establish SSH tunnel connection (if configured)
2. Connect to source and destination databases
3. Migrate data with automatic field mapping
4. Handle date/time fields automatically
5. Report success or failure of the operation

## Data Mapping

The tool currently supports mapping for the following fields in the users table:

- Basic info (name, email, password)
- Contact details (phone, address, city)
- Business info (VAT registration, balance)
- System fields (created_at, updated_at)
- And more...

## Error Handling

The tool includes comprehensive error handling for:

- Database connection failures
- SSH tunnel issues
- Data type mismatches
- Duplicate records
