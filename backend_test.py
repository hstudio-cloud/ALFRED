#!/usr/bin/env python3
"""
Alfred Backend API Test Suite
Tests authentication, tasks, chat, and dashboard endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://alfred-app.preview.emergentagent.com/api"

class AlfredAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
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
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login
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
                else:
                    self.log_test("POST /api/auth/login", False, "Missing token or user in response")
            else:
                self.log_test("POST /api/auth/login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
            
        # Test /me endpoint
        if self.token:
            try:
                headers = {"Authorization": f"Bearer {self.token}"}
                response = requests.get(f"{self.base_url}/auth/me", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and "email" in data:
                        self.log_test("GET /api/auth/me", True, f"User verified: {data['email']}")
                    else:
                        self.log_test("GET /api/auth/me", False, "Missing user data in response")
                else:
                    self.log_test("GET /api/auth/me", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("GET /api/auth/me", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /api/auth/me", False, "No token available from login")
            
    def test_tasks(self):
        """Test task endpoints"""
        print("\n📋 Testing Tasks...")
        
        if not self.token:
            self.log_test("Tasks Test", False, "No authentication token available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test create task
        task_data = {
            "title": "Fazer relatório mensal",
            "description": "Preparar relatório de vendas para apresentação",
            "priority": "high",
            "due_date": "2024-12-31T23:59:59"
        }
        
        task_id = None
        try:
            response = requests.post(f"{self.base_url}/tasks", json=task_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "title" in data:
                    task_id = data["id"]
                    self.log_test("POST /api/tasks", True, f"Task created: {data['title']}")
                else:
                    self.log_test("POST /api/tasks", False, "Missing task data in response")
            else:
                self.log_test("POST /api/tasks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/tasks", False, f"Exception: {str(e)}")
            
        # Test get tasks
        try:
            response = requests.get(f"{self.base_url}/tasks", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/tasks", True, f"Retrieved {len(data)} tasks")
                else:
                    self.log_test("GET /api/tasks", False, "Response is not a list")
            else:
                self.log_test("GET /api/tasks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/tasks", False, f"Exception: {str(e)}")
            
        # Test complete task
        if task_id:
            try:
                response = requests.patch(f"{self.base_url}/tasks/{task_id}/complete", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "completed":
                        self.log_test("PATCH /api/tasks/{id}/complete", True, "Task marked as completed")
                    else:
                        self.log_test("PATCH /api/tasks/{id}/complete", False, f"Task status: {data.get('status')}")
                else:
                    self.log_test("PATCH /api/tasks/{id}/complete", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("PATCH /api/tasks/{id}/complete", False, f"Exception: {str(e)}")
        else:
            self.log_test("PATCH /api/tasks/{id}/complete", False, "No task ID available")
            
    def test_chat(self):
        """Test chat endpoints"""
        print("\n💬 Testing Chat...")
        
        if not self.token:
            self.log_test("Chat Test", False, "No authentication token available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test send message
        message_data = {
            "content": "Preciso fazer um relatório até sexta"
        }
        
        try:
            response = requests.post(f"{self.base_url}/chat/message", json=message_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "actions" in data:
                    self.log_test("POST /api/chat/message", True, f"AI responded with {len(data['actions'])} actions")
                else:
                    self.log_test("POST /api/chat/message", False, "Missing message or actions in response")
            else:
                self.log_test("POST /api/chat/message", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/chat/message", False, f"Exception: {str(e)}")
            
        # Test get chat history
        try:
            response = requests.get(f"{self.base_url}/chat/history", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/chat/history", True, f"Retrieved {len(data)} messages")
                else:
                    self.log_test("GET /api/chat/history", False, "Response is not a list")
            else:
                self.log_test("GET /api/chat/history", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/chat/history", False, f"Exception: {str(e)}")
            
    def test_dashboard(self):
        """Test dashboard endpoints"""
        print("\n📊 Testing Dashboard...")
        
        if not self.token:
            self.log_test("Dashboard Test", False, "No authentication token available")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test get stats
        try:
            response = requests.get(f"{self.base_url}/dashboard/stats", headers=headers)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["tasks_completed", "tasks_pending", "habits_active", "productivity_score"]
                if all(field in data for field in required_fields):
                    self.log_test("GET /api/dashboard/stats", True, f"Stats: {data['tasks_completed']} completed, {data['tasks_pending']} pending")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("GET /api/dashboard/stats", False, f"Missing fields: {missing}")
            else:
                self.log_test("GET /api/dashboard/stats", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/dashboard/stats", False, f"Exception: {str(e)}")
            
        # Test get insights
        try:
            response = requests.get(f"{self.base_url}/dashboard/insights", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "insights" in data and isinstance(data["insights"], list):
                    self.log_test("GET /api/dashboard/insights", True, f"Retrieved {len(data['insights'])} insights")
                else:
                    self.log_test("GET /api/dashboard/insights", False, "Missing or invalid insights in response")
            else:
                self.log_test("GET /api/dashboard/insights", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("GET /api/dashboard/insights", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all tests"""
        print(f"🚀 Starting Alfred API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        self.test_authentication()
        self.test_tasks()
        self.test_chat()
        self.test_dashboard()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
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
    tester = AlfredAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)