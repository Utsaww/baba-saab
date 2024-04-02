import React from 'react';
import styles from "./aboutSection.module.scss";
import Image from 'next/image';
import about1 from "../../../assets/about1.jpg"
import Link from 'next/link';

const AboutSection = ({ button, mainAboutContent,className }) => {
  return (
    <section className={`${styles.aboutSection} ${className}`}>
      <div className={styles.aboutWrapper}>
        <div className={styles.aboutImage}>
          <Image src={about1} alt="about image" />
        </div>
        <div className={`${styles.rightContent} ${mainAboutContent && "pr-4"}`}>
          <h6 className="text-[16px] font-semibold uppercase text-[#cda45e] mb-[16px]">
            About Us
          </h6>
          <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb[16px]">
            We're the largest Events Agency
          </h2>
          <p className="text-[15px] font-normal text-[#8d8d8d] mt-[15px]  text-justify">
            Welcome to "BABA SAAB EVENT COMPANY", where we turn your events into
            unforgettable experiences! With a dedicated team and a passion for
            perfection, we specialize in bringing your visions to life across
            Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur,
            Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nanital, and
            Bhimtal.
          </p>

          {mainAboutContent && (
            <>
              <p className="text-[15px] font-normal text-[#8d8d8d] mt-3 text-justify">
                At "BABA SAAB EVENT COMPANY" we understand that every event is a
                unique celebration of life's special moments. Whether you're
                planning a dream wedding, a corporate gala, or a milestone
                birthday bash, we're here to ensure that every detail is
                flawlessly executed. Our commitment to excellence and
                personalized service sets us apart as the premier choice for
                event planning and management.
              </p>
              <p className="text-[15px] font-normal text-[#8d8d8d] mt-3 text-justify">
                Transform your events into unforgettable experiences with our
                comprehensive range of services. From the whimsical touch of
                Balloon Decorators to the captivating lens of Photographers
                capturing every moment, from the pulsating beats of a Disc
                Jockey to the seamless coordination of Event Organisers, we have
                everything you need to make your event truly spectacular. Our
                team of Wedding Planners ensures that your big day is nothing
                short of magical, while our Party Decorators add flair and charm
                to any celebration. Whether it's a milestone Birthday Party or
                an elegant Wedding, we provide expert services tailored to your
                vision. With Anchoring Services to keep the crowd engaged, Bands
                to set the mood, and Mandap Decorators to create stunning
                ceremonial spaces, we attend to every detail.
              </p>
            </>
          )}
          {button && (
            <Link href="/about">
              <button className={styles.contactBtn}>Read More</button>{" "}
            </Link>
          )}
        </div>
      </div>
      {/* {mainAboutContent && (
        <div className={styles?.mainAboutContent}>
          <p className="text-[15px] font-normal text-[#8d8d8d] text-justify">
            With Baba Saab managing your event nothing is left for a chance. We
            take care of even the smallest things and manage the events as if
            our own.
          </p>
          <p className="text-[15px] font-normal text-[#8d8d8d] text-justify mt-3">
            Baba Saab Event Co. leading Event management portal and largest
            events classified directory with one of its kind services.
          </p>
          <p className="text-[15px] font-normal text-[#8d8d8d] text-justify mt-3">
            We pride ourselves as a well established corporate planners, wedding
            planners, party planners and event managers. We are a 360 degree
            event management, brand marketing and entertainment firm with
            complete focus on providing end to end solutions to meet the
            requirements of our clients. Baba Saab Event Co. stands for three
            creative people who came up together to form an impeccable, ideal
            and ingenious company. Affordability, Quality and Mind Blowing
            Events is what we guarantee. Our main focus is to guarantee great
            memories keeping in mind the budget of the clients because events
            like wedding, sangeet etc do create a hole in your pocket. is our
            company foundation stone with a vision to make peoples big dream a
            reality.
          </p>
        </div>
      )} */}
    </section>
  );
};

export default AboutSection
