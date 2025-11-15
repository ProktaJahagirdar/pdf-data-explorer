import axios from "axios";
const API_BASE = "http://localhost:5100";

export const uploadPDF = (file) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return axios.post(`${API_BASE}/extract`, formData);
};

export const getProperties = () => axios.get(`${API_BASE}/properties`);
export const getUnits = () => axios.get(`${API_BASE}/units`);
export const searchUnits = (params) =>
    axios.get(`${API_BASE}/search`, { params });
