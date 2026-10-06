import BreadCrumb from '@/CommonComponents/BreadCrumb'
import ContactSection from '@/ContactModule';
import React from 'react'

const ContactPage = () => {
  const BreadCrumbData = {
    link: "/contact",
    linkHeading: "Contact",
    mainHeading: "Contact with Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <ContactSection />
    </>
  );
}

export default ContactPage
