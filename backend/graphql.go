package main

import (
	"io"
	"net/http"
	"os"
	"bytes"
)

func graphqlHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	body, _ := io.ReadAll(r.Body)

	req, _ := http.NewRequest("POST", os.Getenv("GRAPHQL_URL"), bytes.NewReader(body))
	req.Header.Add("Authorization", token)
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to query GraphQL", 500)
		return
	}
	defer resp.Body.Close()

	io.Copy(w, resp.Body)
}

