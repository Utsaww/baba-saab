
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import HospitalityManagement from '@/Components/EventPlanner/HospitalityManagement';
import Venue from '@/Components/EventPlanner/Venue';
import React from 'react'

const HospitalityManagementpage = () => {
const BreadCrumbData = {
  link: "/event_planning/hospitality_management",
  linkHeading: "Hospitality Management",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <HospitalityManagement />
    </>
  );
}

export default HospitalityManagementpage
