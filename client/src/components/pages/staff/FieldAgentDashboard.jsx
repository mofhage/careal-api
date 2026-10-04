import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffRouteGuard from '../../../components/staff/StaffRouteGuard.jsx';
import staffAxios from '../../../components/api/staffAxios.js';

export default function FieldAgentDashboard() {
  return <StaffRouteGuard requiredRole='field_agent'><FAContent /></StaffRouteGuard>;
}

function FAContent() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [pending, setPending] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [pendingErr, setPendingErr] = useState('');
  const [myErr, setMyErr] = useState('');
  const [pickMsgs, setPickMsgs] = useState({});
  const [picking, setPicking] = useState({});
  const [statusErr, setStatusErr] = useState({});
  const [updating, setUpdating] = useState({});
  const [selectedStatus, setSelectedStatus] = useState({});
  const logout=()=>{localStorage.removeItem('staff_token');navigate('/staff/login');};
