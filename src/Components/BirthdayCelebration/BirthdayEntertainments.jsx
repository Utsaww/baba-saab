import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const BirthdayEntertainments = () => {
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
                Elevate Your Celebration with Engaging Entertainment
              </h1>
              <p className={styles?.weddingText}>
                Turn your birthday celebration into a joyous extravaganza with
                Baba Saab Event's Entertainment Services, spanning across
                enchanting locations like Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>

              <p className={styles?.weddingText}>
                Our dedicated team is here to sprinkle a dash of fun and
                excitement to your special day. From lively music to captivating
                performances and interactive activities, we curate entertainment
                experiences that cater to all ages and preferences. Whether
                you're hosting a kids' party, a milestone celebration, or an
                intimate gathering, we ensure that the entertainment resonates
                with the spirit of your celebration.
              </p>
              <p className={styles?.weddingText}>
                Let us take the stage and create moments that will be remembered
                for a lifetime. From live bands and DJs to engaging games and
                activities, Baba Saab Event's Entertainment Services promise to
                keep the energy high and the smiles wide. Your birthday
                celebration will not only be a party but a dynamic experience
                that leaves a lasting impression on you and your guests, no
                matter which beautiful location you choose for your celebration.
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

export default BirthdayEntertainments;
