import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leghe from "./pages/Leghe";
import Partite from "./pages/Partite";
import Classifica from "./pages/Classifica";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/leghe" element={<Leghe />} />
        <Route path="/partite" element={<Partite />} />
        <Route path="/classifica" element={<Classifica />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;