// frontend/src/App.js
import React from "react";
import UploadPDF from "./components/UploadPDF";
import SearchBar from "./components/SearchBar";
import './App.css';

function App() {
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>PDF Data Explorer</h1>
      <UploadPDF />
      <hr />
      <SearchBar />
    </div>
  );
}

export default App;
