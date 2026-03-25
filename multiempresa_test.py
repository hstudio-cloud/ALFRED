#!/usr/bin/env python3
"""
Alfred Multiempresa API Test Suite
Tests workspace and client/CRM endpoints for multi-company functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://alfred-app.preview.emergentagent.com/api"

class AlfredMultiempresaTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.workspace_id = None
        self.client_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_authentication(self):
        """Test authentication to get token"""
        print("\n🔐 Testing Authentication...")
        
        login_data = {
            "email": "admin@alfred.com",
            "password": "Admin@123456"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.user_id = data["user"]["id"]
                    self.log_test("POST /api/auth/login", True, f"Token received, user: {data['user']['name']}")
                    return True
                else:
                    self.log_test("POST /api/auth/login", False, "Missing token or user in response")
                    return False
            else:
                self.log_test("POST /api/auth/login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
            
    def test_workspaces_api(self):
        """Test workspace endpoints"""
        print("\n🏢 Testing Workspaces API...")
        
        if not self.token:
            self.log_test("Workspaces Test", False, "No authentication token available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test GET /api/workspaces - list workspaces
        try:
            response = requests.get(f"{self.base_url}/workspaces", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/workspaces", True, f"Retrieved {len(data)} workspaces")
                    # Store first workspace ID for later tests
                    if data:
                        self.workspace_id = data[0]["id"]
                        print(f"   Using workspace ID: {self.workspace_id}")
                else:
                    self.log_test("GET /api/workspaces", False, "Response is not a list")
            else:
                self.log_test("GET /api/workspaces", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/workspaces", False, f"Exception: {str(e)}")
            
        # Test POST /api/workspaces - create new workspace
        workspace_data = {
            "name": "Test Company",
            "subdomain": "testcompany",
            "description": "Empresa de teste para validação da API"
        }
        
        try:
            response = requests.post(f"{self.base_url}/workspaces", json=workspace_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data:
                    new_workspace_id = data["id"]
                    self.log_test("POST /api/workspaces", True, f"Workspace created: {data['name']} (ID: {new_workspace_id})")
                    # Use the new workspace for client tests
                    self.workspace_id = new_workspace_id
                else:
                    self.log_test("POST /api/workspaces", False, "Missing workspace data in response")
            else:
                self.log_test("POST /api/workspaces", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/workspaces", False, f"Exception: {str(e)}")
            
        # Test GET /api/workspaces/{id} - get specific workspace
        if self.workspace_id:
            try:
                response = requests.get(f"{self.base_url}/workspaces/{self.workspace_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and "name" in data:
                        self.log_test("GET /api/workspaces/{id}", True, f"Retrieved workspace: {data['name']}")
                    else:
                        self.log_test("GET /api/workspaces/{id}", False, "Missing workspace data in response")
                else:
                    self.log_test("GET /api/workspaces/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("GET /api/workspaces/{id}", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /api/workspaces/{id}", False, "No workspace ID available")
            
    def test_clients_api(self):
        """Test client/CRM endpoints"""
        print("\n👥 Testing Clients/CRM API...")
        
        if not self.token:
            self.log_test("Clients Test", False, "No authentication token available")
            return
            
        if not self.workspace_id:
            self.log_test("Clients Test", False, "No workspace ID available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test GET /api/clients?workspace_id={workspace_id} - list clients
        try:
            response = requests.get(f"{self.base_url}/clients?workspace_id={self.workspace_id}", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/clients?workspace_id={workspace_id}", True, f"Retrieved {len(data)} clients")
                else:
                    self.log_test("GET /api/clients?workspace_id={workspace_id}", False, "Response is not a list")
            else:
                self.log_test("GET /api/clients?workspace_id={workspace_id}", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/clients?workspace_id={workspace_id}", False, f"Exception: {str(e)}")
            
        # Test POST /api/clients?workspace_id={workspace_id} - create client
        client_data = {
            "name": "João Silva",
            "email": "joao@example.com",
            "phone": "(11) 99999-9999",
            "document": "123.456.789-00"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clients?workspace_id={self.workspace_id}", json=client_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data:
                    self.client_id = data["id"]
                    self.log_test("POST /api/clients?workspace_id={workspace_id}", True, f"Client created: {data['name']} (ID: {self.client_id})")
                else:
                    self.log_test("POST /api/clients?workspace_id={workspace_id}", False, "Missing client data in response")
            else:
                self.log_test("POST /api/clients?workspace_id={workspace_id}", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/clients?workspace_id={workspace_id}", False, f"Exception: {str(e)}")
            
        # Test GET /api/clients/{client_id}?workspace_id={workspace_id} - get specific client
        if self.client_id:
            try:
                response = requests.get(f"{self.base_url}/clients/{self.client_id}?workspace_id={self.workspace_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and "name" in data:
                        self.log_test("GET /api/clients/{client_id}?workspace_id={workspace_id}", True, f"Retrieved client: {data['name']}")
                    else:
                        self.log_test("GET /api/clients/{client_id}?workspace_id={workspace_id}", False, "Missing client data in response")
                else:
                    self.log_test("GET /api/clients/{client_id}?workspace_id={workspace_id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("GET /api/clients/{client_id}?workspace_id={workspace_id}", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /api/clients/{client_id}?workspace_id={workspace_id}", False, "No client ID available")
            
        # Test PUT /api/clients/{client_id}?workspace_id={workspace_id} - update client
        if self.client_id:
            update_data = {
                "name": "João Silva Santos",
                "phone": "(11) 88888-8888",
                "notes": "Cliente atualizado via API"
            }
            
            try:
                response = requests.put(f"{self.base_url}/clients/{self.client_id}?workspace_id={self.workspace_id}", json=update_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and data["name"] == update_data["name"]:
                        self.log_test("PUT /api/clients/{client_id}?workspace_id={workspace_id}", True, f"Client updated: {data['name']}")
                    else:
                        self.log_test("PUT /api/clients/{client_id}?workspace_id={workspace_id}", False, "Client data not updated correctly")
                else:
                    self.log_test("PUT /api/clients/{client_id}?workspace_id={workspace_id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("PUT /api/clients/{client_id}?workspace_id={workspace_id}", False, f"Exception: {str(e)}")
        else:
            self.log_test("PUT /api/clients/{client_id}?workspace_id={workspace_id}", False, "No client ID available")
            
        # Test GET /api/clients/{client_id}/history?workspace_id={workspace_id} - get client activity history
        if self.client_id:
            try:
                response = requests.get(f"{self.base_url}/clients/{self.client_id}/history?workspace_id={self.workspace_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        self.log_test("GET /api/clients/{client_id}/history?workspace_id={workspace_id}", True, f"Retrieved {len(data)} activity records")
                    else:
                        self.log_test("GET /api/clients/{client_id}/history?workspace_id={workspace_id}", False, "Response is not a list")
                else:
                    self.log_test("GET /api/clients/{client_id}/history?workspace_id={workspace_id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("GET /api/clients/{client_id}/history?workspace_id={workspace_id}", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /api/clients/{client_id}/history?workspace_id={workspace_id}", False, "No client ID available")
            
    def test_multiempresa_isolation(self):
        """Test that multiempresa isolation works correctly"""
        print("\n🔒 Testing Multiempresa Isolation...")
        
        if not self.token or not self.workspace_id:
            self.log_test("Isolation Test", False, "Missing authentication or workspace data")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Try to access clients with invalid workspace ID
        fake_workspace_id = "invalid-workspace-id"
        try:
            response = requests.get(f"{self.base_url}/clients?workspace_id={fake_workspace_id}", headers=headers)
            if response.status_code == 404:
                self.log_test("Workspace Isolation - Invalid Workspace", True, "Correctly rejected invalid workspace ID")
            elif response.status_code == 403:
                self.log_test("Workspace Isolation - Invalid Workspace", True, "Correctly denied access to invalid workspace")
            else:
                self.log_test("Workspace Isolation - Invalid Workspace", False, f"Unexpected status: {response.status_code}")
        except Exception as e:
            self.log_test("Workspace Isolation - Invalid Workspace", False, f"Exception: {str(e)}")
            
        # Try to access client from different workspace
        if self.client_id:
            try:
                response = requests.get(f"{self.base_url}/clients/{self.client_id}?workspace_id={fake_workspace_id}", headers=headers)
                if response.status_code in [403, 404]:
                    self.log_test("Client Isolation - Cross-workspace Access", True, "Correctly prevented cross-workspace client access")
                else:
                    self.log_test("Client Isolation - Cross-workspace Access", False, f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test("Client Isolation - Cross-workspace Access", False, f"Exception: {str(e)}")
        else:
            self.log_test("Client Isolation - Cross-workspace Access", False, "No client ID available for testing")
            
    def run_all_tests(self):
        """Run all multiempresa tests"""
        print(f"🚀 Starting Alfred Multiempresa API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
            
        self.test_workspaces_api()
        self.test_clients_api()
        self.test_multiempresa_isolation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 MULTIEMPRESA TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
                    
        return passed == total

if __name__ == "__main__":
    tester = AlfredMultiempresaTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)