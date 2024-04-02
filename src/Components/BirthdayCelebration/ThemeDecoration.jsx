import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const BirthdayThemeDecoration = () => {
  const topService = [
    {
      id: 1,
      routeName: "Theme Decoration",
      routeLink: "/birthday_celebration/theme_decoration",
    },
    {
      id: 2,
      routeName: "Entertainments",
      routeLink: "/birthday_celebration/entertainments",
    },
    {
      id: 3,
      routeName: "Venue",
      routeLink: "/birthday_celebration/venue",
    },
    {
      id: 4,
      routeName: "Activities",
      routeLink: "/birthday_celebration/activities",
    },
  ];
  const instaData = [
    {
      id: 1,
      name: insta,
      alt: "insta",
    },
    {
      id: 2,
      name: insta,
      alt: "insta",
    },
    {
      id: 3,
      name: insta,
      alt: "insta",
    },
    {
      id: 4,
      name: insta,
      alt: "insta",
    },
    {
      id: 5,
      name: insta,
      alt: "insta",
    },
    {
      id: 6,
      name: insta,
      alt: "insta",
    },
  ];
  return (
    <>
      <section className={styles?.weddingPlanner}>
        <div className={styles?.container}>
          <div className={styles?.weddingPlannerContent}>
            <div className={styles?.leftContent}>
              <div className={styles?.leftImageWrapper}>
                <Image src={wedding} alt="wedding" fill priority />
              </div>
              <h1 className={styles?.weddingPlannerHeading}>
                Transform Your Event with Stunning Theme Decoration
              </h1>
              <p className={styles?.weddingText}>
                Elevate your birthday celebration with Baba Saab Event's Theme
                Decoration services, spanning across enchanting locations like
                Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur,
                Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital,
                and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                Our expert team specializes in crafting personalized and
                enchanting themes that turn your celebration into a magical
                experience. Whether you dream of a fairy-tale setting, a
                superhero extravaganza, or a tropical paradise, we bring your
                vision to life with creativity and flair.
              </p>
              <p className={styles?.weddingText}>
                From selecting the perfect color palette to coordinating
                decorations, we pay meticulous attention to detail to ensure a
                visually stunning and cohesive theme. Let us transform your
                venue into a captivating space where every element aligns with
                your chosen theme, creating an ambiance that delights both
                children and adults.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, your birthday celebration becomes more
                than just a party – it becomes a unique and memorable experience
                tailored to your preferences. Trust us to make your special day
                extraordinary, no matter where you are in the picturesque
                landscape of these wonderful locations.
              </p>
            </div>
            <div className={styles?.rightContent}>
              <OtherLinksSection topService={topService} />
              <InstaGramSection instaData={instaData} />
            </div>
          </div>
        </div>
      </section>
      {/* <Service
        ServiceData={weddingServiceData}
        serviceName="Wedding Service"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      /> */}
    </>
  );
};

export default BirthdayThemeDecoration;
