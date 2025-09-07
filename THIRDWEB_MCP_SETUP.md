# thirdweb MCP Server Setup Guide

This project is now configured to use the thirdweb Model Context Protocol (MCP) server, which enables AI agents to interact with any EVM-compatible blockchain through thirdweb's suite of tools.

## Prerequisites

- Python 3.10 or higher
- A thirdweb Secret Key from the [thirdweb dashboard](https://thirdweb.com/dashboard)

## Installation

### Option 1: Install with uvx (Recommended)
```bash
THIRDWEB_SECRET_KEY=your_secret_key uvx thirdweb-mcp
```

### Option 2: Install with pipx
```bash
pipx install thirdweb-mcp
THIRDWEB_SECRET_KEY=your_secret_key thirdweb-mcp
```

## Configuration

The project includes two configuration files:

### 1. `.mcp.json` (Project MCP Configuration)
Contains the thirdweb MCP server configuration with environment variables.

### 2. `.claude/settings.local.json` (Claude Code Settings)
Enables the thirdweb MCP server with:
- `enableAllProjectMcpServers: true`
- `enabledMcpjsonServers: ["thirdweb-mcp"]`

## Setup Steps

1. **Get your thirdweb Secret Key**:
   - Visit [thirdweb dashboard](https://thirdweb.com/dashboard)
   - Create or access your project
   - Generate a secret key

2. **Update Environment Variables**:
   Edit `.mcp.json` and replace the placeholder values:
   ```json
   {
     "THIRDWEB_SECRET_KEY": "your_actual_secret_key_here",
     "THIRDWEB_ENGINE_URL": "your_engine_url_if_using_engine",
     "THIRDWEB_ENGINE_AUTH_JWT": "your_engine_jwt_if_using_engine",
     "THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS": "your_backend_wallet_address_if_using_engine"
   }
   ```

3. **Install the MCP Server** (if not already installed globally):
   ```bash
   pipx install thirdweb-mcp
   ```

4. **Restart Claude Code** to load the new MCP server configuration

## Features

The thirdweb MCP server provides:

- **Real-time Onchain Data Querying**: Access blockchain data through thirdweb Insight
- **Smart Contract Analysis**: Retrieve source code and ABIs for any contract
- **Autonomous Transaction Execution**: Execute blockchain transactions via thirdweb Engine
- **Multi-chain Support**: Connect to any EVM-compatible blockchain

## Testing

Once configured, you can test the integration by asking Claude to:
- Query blockchain data
- Analyze smart contracts
- Execute transactions (if Engine is configured)
- Interact with various EVM chains

## Additional Resources

- [thirdweb MCP Server Documentation](https://blog.thirdweb.com/changelog/thirdweb-mcp-server-v0-1-beta/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [thirdweb Dashboard](https://thirdweb.com/dashboard)
- [thirdweb Context Files for LLMs](https://portal.thirdweb.com/llms.txt)