import BreadCrumb from '@/CommonComponents/BreadCrumb';
import StageDecorations from '@/Components/WeddingPlanner/StageDecorations';
import React from 'react'

const StageDecorationPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/stage_decorations",
    linkHeading: "Stage Decoration",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <StageDecorations />
    </>
  );
}

export default StageDecorationPage
