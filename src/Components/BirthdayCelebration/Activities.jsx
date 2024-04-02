import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "../../../public/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const Activities = () => {
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
                Create Memorable Moments with Exciting Activities
              </h1>
              <p className={styles?.weddingText}>
                Add a dash of excitement to your birthday bash with Baba Saab
                Event's Birthday Celebration Services – Activities, available in
                enchanting locations like Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                Our expert team is here to ensure that your celebration is
                filled with fun and memorable moments. From engaging games and
                thrilling activities to entertaining performances and
                interactive experiences, we offer a wide range of options to
                suit all ages and interests.
              </p>
              <p className={styles?.weddingText}>
                Whether you're looking to keep the kids entertained with a
                fun-filled treasure hunt or want to get the adults involved in a
                friendly competition, we have something for everyone. Let us
                take care of the planning and coordination, so you can sit back,
                relax, and enjoy the festivities with your loved ones.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, your birthday celebration will be more
                than just a party – it will be an unforgettable experience
                filled with laughter, joy, and excitement. Trust us to bring the
                fun and ensure that your special day is one to remember.
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

export default Activities;
