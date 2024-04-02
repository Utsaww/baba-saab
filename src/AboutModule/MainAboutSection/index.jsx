import React from 'react';
import styles from "./mainAboutSection.module.scss";
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import AboutSection from '@/HomeModule/Component/AboutSection/AboutSection';
import Testimonials from '@/HomeModule/Component/Testimonials/Testimonials';
import WhyUs from '@/HomeModule/Component/WhyUs/WhyUs';
import HomeContact from '@/HomeModule/Component/HomeContactSection/HomeContact';
import OurTeam from '../OurTeamSection';

const MainAbout = () => {
  const BreadCrumbData = {
    link: "/about",
    linkHeading: "About Us",
    mainHeading: "Some Information About Us",
  }
  return (
    <section className={styles?.MainAbout}>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <AboutSection mainAboutContent={true} className={styles?.aboutSection} />

      <WhyUs />
      <OurTeam />
      <HomeContact />
      <Testimonials />
    </section>
  );
}

export default MainAbout
