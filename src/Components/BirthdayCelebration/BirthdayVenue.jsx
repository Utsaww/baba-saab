import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const BirthdayVenue = () => {
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
                Discover the Perfect Venue for Your Dream Event
              </h1>
              <p className={styles?.weddingText}>
                Choose the perfect backdrop for your special day with Baba Saab
                Event's Birthday Celebration Services – Venue selection,
                spanning across enchanting locations like Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal.
              </p>

              <p className={styles?.weddingText}>
                Our experienced team is dedicated to finding the ideal venue
                that sets the stage for your dream celebration. Whether you
                fancy a rustic ambiance, the tranquility of nature, or the
                vibrant energy of a cityscape, we offer a diverse range of
                venues to suit every style and preference.
              </p>
              <p className={styles?.weddingText}>
                From cozy spaces for intimate gatherings to grand halls for
                lavish parties, we ensure that the venue complements your vision
                and adds that extra touch of magic to your birthday celebration.
                Let us take the stress out of venue selection, allowing you to
                focus on creating beautiful memories with your loved ones.
              </p>
              <p className={styles?.weddingText}>
                With Baba Saab Event, your birthday venue becomes more than just
                a location – it becomes an integral part of the celebration,
                reflecting the uniqueness of your special day. Trust us to find
                the perfect spot in any of these enchanting locations, ensuring
                your celebration is nothing short of spectacular.
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

export default BirthdayVenue;
