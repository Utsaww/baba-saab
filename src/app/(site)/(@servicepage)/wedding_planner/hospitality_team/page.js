import BreadCrumb from '@/CommonComponents/BreadCrumb';
import HospitalityTeam from '@/Components/WeddingPlanner/HospitalityTeam';
import React from 'react'

const HospitalityTeamPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/hospitality_team",
    linkHeading: "Hospitality Team",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <HospitalityTeam />
    </>
  );
}

export default HospitalityTeamPage
