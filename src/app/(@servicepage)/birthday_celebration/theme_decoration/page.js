
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import BirthdayThemeDecoration from '@/Components/BirthdayCelebration/ThemeDecoration';
import React from 'react'

const EventBudgetingpage = () => {
const BreadCrumbData = {
  link: "/birthday_celebration/theme_decoration",
  linkHeading: "Theme Decoration",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <BirthdayThemeDecoration />
    </>
  );
}

export default EventBudgetingpage
