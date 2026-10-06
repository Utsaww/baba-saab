import BreadCrumb from '@/CommonComponents/BreadCrumb';
import JaimalaTheme from '@/Components/WeddingPlanner/JaimalaTheme';
import React from 'react'

const JaimalaThemepage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/jaimala_theme",
    linkHeading: "Jaimala Theme",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <JaimalaTheme />
    </>
  );
}

export default JaimalaThemepage
