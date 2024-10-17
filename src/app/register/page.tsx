"use client";  // Diese Komponente wird auf dem Client gerendert

import { useState } from 'react';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    availableFrom: '',
    availableTo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/register-trainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Trainer erfolgreich registriert!');
      } else {
        alert('Fehler bei der Registrierung');
      }
    } catch (error) {
      console.error('Error during registration:', error);
    }
  };

  return (
    <div className="bg-gradient">
      <form onSubmit={handleSubmit} className="glassmorphism">
        <h2 className="text-3xl font-bold text-center text-[#233b61] mb-6">Trainer-Registrierung</h2>

        <div>
          <input
            type="text"
            name="firstName"
            placeholder="Vorname"
            value={formData.firstName}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <input
            type="text"
            name="lastName"
            placeholder="Nachname"
            value={formData.lastName}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="E-Mail"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <input
            type="text"
            name="phone"
            placeholder="Telefonnummer"
            value={formData.phone}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <input
            type="datetime-local"
            name="availableFrom"
            value={formData.availableFrom}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <input
            type="datetime-local"
            name="availableTo"
            value={formData.availableTo}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <button type="submit" className="button-style">Registrieren</button>
      </form>
    </div>
  );
}
