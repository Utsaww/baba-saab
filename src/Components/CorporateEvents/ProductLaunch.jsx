import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const ProductLaunch = () => {
  const topService = [
    {
      id: 1,
      routeName: "Product Launch",
      routeLink: "/corporate_events/product_launch",
    },
    {
      id: 2,
      routeName: "Dealers meet",
      routeLink: "/corporate_events/dealers_meet",
    },
    {
      id: 3,
      routeName: "Annual Function",
      routeLink: "/corporate_events/annual_function",
    },
    {
      id: 4,
      routeName: "International tour planning",
      routeLink: "/corporate_events/international_tour",
    },
    {
      id: 5,
      routeName: "Fabrication",
      routeLink: "/corporate_events/fabrication",
    }
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
                Unveil Success: Expertly Crafted Product Launch Events
              </h1>
              <p className={styles?.weddingText}>
                Elevate your product launch to new heights with Baba Saab
                Event's expert corporate event services in Ramanagar, Jim
                Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani,
                Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, and
                Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                We specialize in creating unforgettable experiences that
                showcase your brand and captivate your audience. From venue
                selection to event planning and execution, our team handles
                every detail with precision and professionalism.
              </p>
              <p className={styles?.weddingText}>
                Whether you're unveiling a new product, launching a marketing
                campaign, or hosting a promotional event, we tailor our services
                to meet your specific needs and objectives. Our innovative
                approach and creative solutions ensure that your corporate event
                stands out and makes a lasting impact.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event take the stress out of planning your product
                launch, so you can focus on connecting with your audience and
                achieving your business goals. With our expertise and
                dedication, your event is sure to be a success, leaving a
                lasting impression on all who attend.
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

export default ProductLaunch;
