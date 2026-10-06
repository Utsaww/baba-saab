
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import Activities from '@/Components/BirthdayCelebration/Activities';
import HospitalityManagement from '@/Components/EventPlanner/HospitalityManagement';
import Venue from '@/Components/EventPlanner/Venue';
import React from 'react'

const ActivitiesPage = () => {
const BreadCrumbData = {
  link: "/birthday_celebration",
  linkHeading: "Activities",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Activities />
    </>
  );
}

export default ActivitiesPage
