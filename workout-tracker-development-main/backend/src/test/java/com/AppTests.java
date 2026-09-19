package com;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit tests for the request-body value helpers. These run without a database
 * so `mvn test` stays fast and self-contained.
 */
class AppTests {

    @Test
    void strTrimsAndNullifiesBlanks() {
        assertEquals("hello", V.str("  hello  "));
        assertNull(V.str("   "));
        assertNull(V.str(null));
    }

    @Test
    void intParsesNumbersAndRounds() {
        assertEquals(3, V.intOrNull(3));
        assertEquals(4, V.intOrNull(3.6));
        assertEquals(5, V.intOrNull("5"));
        assertNull(V.intOrNull("not-a-number"));
        assertNull(V.intOrNull(null));
    }

    @Test
    void dblParsesNumbers() {
        assertEquals(2.5, V.dblOrNull(2.5));
        assertEquals(10.0, V.dblOrNull("10"));
        assertNull(V.dblOrNull(null));
    }

    @Test
    void listOfMapsIsSafe() {
        assertEquals(0, V.listOfMaps(null).size());
        assertEquals(0, V.listOfMaps("nope").size());
    }
}
