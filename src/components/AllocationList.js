import React, { useState, useEffect } from 'react';
import { allocationAPI, studentAPI, roomAPI } from '../services/api';

function AllocationList() {
  const [allocations, setAllocations] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    roomId: ''
  });

  useEffect(() => {
    fetchAllocations();
    fetchStudents();
    fetchRooms();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await allocationAPI.getAll();
      setAllocations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await roomAPI.getAll();
      setRooms(response.data.filter(room => room.availableBeds > 0));
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await allocationAPI.allocate(formData.studentId, formData.roomId);
      alert('Room allocated successfully!');
      resetForm();
      fetchAllocations();
      fetchRooms();
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await allocationAPI.checkIn(id, new Date().toISOString().split('T')[0]);
      alert('Student checked in successfully!');
      fetchAllocations();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleCheckOut = async (id) => {
    if (window.confirm('Are you sure you want to check out this student?')) {
      try {
        await allocationAPI.checkOut(id, new Date().toISOString().split('T')[0]);
        alert('Student checked out successfully!');
        fetchAllocations();
        fetchRooms();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  };

const handleDelete = async (id) => {
  const confirmDelete = window.confirm('Are you sure you want to delete this allocation?');

  if (!confirmDelete) return;

  // Ask for password
  const password = window.prompt('Enter admin password to delete:');

  // Check password
  if (password !== '2006') {
    alert('Incorrect password! Deletion not allowed.');
    return;
  }

  try {
    await allocationAPI.delete(id);
    alert('Allocation deleted successfully!');
    fetchAllocations();
    fetchRooms();
  } catch (error) {
    alert('Error deleting allocation: ' + error.message);
  }
};


  const resetForm = () => {
    setFormData({
      studentId: '',
      roomId: ''
    });
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading allocations...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h2>Room Allocations</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Allocate New Room'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{marginBottom: '2rem'}}>
            <div className="form-group">
              <label>Student *</label>
              <select
                required
                value={formData.studentId}
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Available Room *</label>
              <select
                required
                value={formData.roomId}
                onChange={(e) => setFormData({...formData, roomId: e.target.value})}
              >
                <option value="">Select Room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.hostel.name} - Room {room.roomNumber} (Available: {room.availableBeds})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-success">
              Allocate Room
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll Number</th>
              <th>Hostel</th>
              <th>Room</th>
              <th>Allocation Date</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{allocation.student.name}</td>
                <td>{allocation.student.rollNumber}</td>
                <td>{allocation.room.hostel.name}</td>
                <td>{allocation.room.roomNumber}</td>
                <td>{allocation.allocationDate}</td>
                <td>{allocation.checkInDate || 'Not Checked In'}</td>
                <td>{allocation.checkOutDate || '-'}</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: allocation.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                    color: allocation.status === 'ACTIVE' ? '#155724' : '#721c24'
                  }}>
                    {allocation.status}
                  </span>
                </td>
                <td>
                  {allocation.status === 'ACTIVE' && !allocation.checkInDate && (
                    <button className="btn btn-success" onClick={() => handleCheckIn(allocation.id)}>
                      Check In
                    </button>
                  )}
                  {allocation.status === 'ACTIVE' && allocation.checkInDate && (
                    <button className="btn btn-secondary" onClick={() => handleCheckOut(allocation.id)}>
                      Check Out
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => handleDelete(allocation.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AllocationList;
