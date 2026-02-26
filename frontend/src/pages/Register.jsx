//Registration frontend
//Imports
import { useState } from "react";
import { registerUser } from "../api";

const Register = () => {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = await registerUser(form);

    alert(data.message);
  };

  return (
    <div></div>
  );
};

export default Register;