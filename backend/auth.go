package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func loginHandler(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	password := r.FormValue("password")

	if username == "" || password == "" {
		http.Error(w, `{"error":"Missing credentials"}`, http.StatusBadRequest)
		return
	}

	// Encode credentials in base64 for Basic Auth
	encoded := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))

	// Create POST request to SIGNIN_URL
	req, err := http.NewRequest("POST", os.Getenv("SIGNIN_URL"), nil)
	if err != nil {
		http.Error(w, `{"error":"Failed to create request"}`, http.StatusInternalServerError)
		fmt.Println("Request creation error:", err)
		return
	}
	req.Header.Add("Authorization", "Basic "+encoded)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, `{"error":"Request to platform failed"}`, http.StatusInternalServerError)
		fmt.Println("Request error:", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// If platform rejects credentials
	if resp.StatusCode != http.StatusOK {
		fmt.Println("Platform returned:", resp.StatusCode)
		fmt.Println("Body:", string(body))
		http.Error(w, `{"error":"Invalid credentials"}`, resp.StatusCode)
		return
	}

	// Parse token (response is a raw string like: "ey...")
	var token string
	if err := json.Unmarshal(body, &token); err != nil {
		fmt.Println("JSON parsing error:", err)
		http.Error(w, `{"error":"Failed to parse token string"}`, 500)
		return
	}

	// Send token to frontend
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
	})
}
