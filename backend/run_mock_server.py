"""
Runs the real Dropa FastAPI app over HTTP, backed by an in-memory MongoDB
mock instead of a real MongoDB instance (Docker Desktop's daemon would not
start in this sandbox). Used only for manual end-to-end UI verification
during the audit - never for production.
"""
import os

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'dropa_manual_test')
os.environ.setdefault('JWT_SECRET', 'manual-test-secret')

import uvicorn
from mongomock_motor import AsyncMongoMockClient

import server

mock_client = AsyncMongoMockClient()
server.db = mock_client['dropa_manual_test']
server.client = mock_client

if __name__ == '__main__':
    uvicorn.run(server.app, host='127.0.0.1', port=8010, log_level='info')
